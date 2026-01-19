
export async function createCheckout(plan: 'agent' | 'premium', user_id: string) {
  const endpoint = `${import.meta.env.VITE_EDGE_BASE_URL}/create-checkout-session`;
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plan, user_id }),
  });
  if (!resp.ok) throw new Error('Failed to start checkout');
  return await resp.json() as { url: string };
}
