"""
LangGraph scraper agent.

Graph layout
────────────
  START
    │
    ▼
  ┌─────────────┐   remaining == 0   ┌─────────────┐
  │  supervisor │ ──────────────────► │     END     │
  └──────┬──────┘                     └─────────────┘
         │ remaining > 0
         ▼
  ┌─────────────┐
  │  tools node │  (executes tool calls chosen by the LLM)
  └──────┬──────┘
         │
         └──────────────────────────────► supervisor (loop)

The supervisor is a ChatOpenAI model with the four tools bound to it.
It decides which tool to call next; the tools node executes the call
and returns the result as a ToolMessage. The cycle repeats until the
agent emits a final AIMessage (no tool calls) or the daily target is met.
"""

from __future__ import annotations

import os
from textwrap import dedent
from typing import Annotated, Sequence

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from typing_extensions import TypedDict

from tools import (
    check_duplicate,
    count_saved_today,
    get_listing_urls,
    save_property_listing,
    scrape_property_details,
)

# ── State ──────────────────────────────────────────────────────────────────────

class ScraperState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


# ── LLM + tools ───────────────────────────────────────────────────────────────

TOOLS = [
    get_listing_urls,
    scrape_property_details,
    check_duplicate,
    save_property_listing,
    count_saved_today,
]

def _build_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=os.environ.get("OPENAI_MODEL", "gpt-4o"),
        temperature=0,
    ).bind_tools(TOOLS)


SYSTEM_PROMPT = dedent("""
    You are an autonomous property listing agent for kenyaproperties.co.ke,
    Kenya's real estate platform.

    YOUR TASK
    ─────────
    Scrape exactly {target} new residential property listings from Kenyan real
    estate websites and save them to Firebase Firestore.

    WORKFLOW  (follow strictly)
    ────────
    1. Call count_saved_today to learn how many have already been saved.
    2. If remaining == 0, respond with a final summary and stop.
    3. Otherwise pick a source from: BuyRentKenya, PigiaMe, Property24
    4. Call get_listing_urls(source_name) to get up to 20 candidate URLs.
    5. For each candidate URL (process one at a time):
       a. Call check_duplicate(url) — skip it if exists==true.
       b. Call scrape_property_details(url) to extract the property data.
       c. If extraction failed or the listing lacks a title/city, skip it.
       d. Call save_property_listing(property_json) to upload images and save.
       e. After each successful save, re-check remaining count.
       f. Stop as soon as you have saved enough to reach the daily target.
    6. If one source doesn't yield enough listings, try the next source.
    7. Once the target is reached, output a concise summary:
       "Saved X/Y properties today. [List titles + cities]"

    RULES
    ─────
    - NEVER save the same source_url twice (always check_duplicate first).
    - NEVER fabricate or guess property data — only save what is on the page.
    - If a price looks like USD/EUR, skip that listing.
    - Focus on Kenyan properties: Nairobi, Mombasa, Kisumu, Nakuru, Kiambu, etc.
    - Each save call uploads images automatically; do not call upload separately.
    - Be efficient: do not re-scrape a URL you have already processed.
""").strip()


# ── Graph nodes ────────────────────────────────────────────────────────────────

def supervisor_node(state: ScraperState):
    """LLM step — choose the next tool call or return a final message."""
    llm = _build_llm()
    target = int(os.environ.get("SCRAPER_DAILY_TARGET", "10"))
    system = SystemMessage(content=SYSTEM_PROMPT.format(target=target))
    response = llm.invoke([system] + list(state["messages"]))
    return {"messages": [response]}


def route_after_supervisor(state: ScraperState):
    """Continue looping while there are pending tool calls; otherwise end."""
    last = state["messages"][-1]
    if isinstance(last, AIMessage) and last.tool_calls:
        return "tools"
    return END


# ── Graph assembly ─────────────────────────────────────────────────────────────

def build_graph():
    tool_node = ToolNode(TOOLS)

    graph = StateGraph(ScraperState)
    graph.add_node("supervisor", supervisor_node)
    graph.add_node("tools", tool_node)

    graph.add_edge(START, "supervisor")
    graph.add_conditional_edges("supervisor", route_after_supervisor, {"tools": "tools", END: END})
    graph.add_edge("tools", "supervisor")

    return graph.compile()


# ── Public entry point ─────────────────────────────────────────────────────────

def run_scraper() -> str:
    """Run one full scraping session. Returns the agent's final summary message."""
    app = build_graph()

    target = int(os.environ.get("SCRAPER_DAILY_TARGET", "10"))
    initial_message = HumanMessage(
        content=(
            f"Start the daily scraping session. "
            f"Goal: save {target} new property listings to Firebase today. "
            f"Begin by checking how many have already been saved today."
        )
    )

    final_state = app.invoke(
        {"messages": [initial_message]},
        config={"recursion_limit": 200},   # allow enough loops for 10 properties
    )

    # Return the last AI text message as the summary
    for msg in reversed(final_state["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            return str(msg.content)
    return "Scraping session completed."
