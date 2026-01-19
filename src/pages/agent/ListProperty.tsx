
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "customer";

    // Insert property
    const { error: insertErr } = await supabase.from("properties").insert({
      title,
      price: Number(price),
      owner_id: user.id,
      published: false,
    });
    if (insertErr) throw insertErr;

    // Upgrade role if customer
    if (role === "customer") {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ role: "agent" })
        .eq("id", user.id);
      if (updateErr) throw updateErr;
      toast.success("Listing added and role upgraded to Agent!");
    } else {
      toast.success("Listing added successfully!");
    }

    navigate("/dashboard");
  } catch (err: any) {
    toast.error(err.message || "Failed to add listing");
  } finally {
    setLoading(false);
  }
};
