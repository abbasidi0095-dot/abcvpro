const WHOP_API_KEY = process.env.WHOP_API_KEY || "";

interface WhopMembership {
  id: string;
  status: string;
  valid: boolean;
  email?: string;
  user?: {
    email?: string;
  };
}

/**
 * Directly queries Whop's REST API V2 for any valid memberships associated with the user's email.
 * This provides immediate active-session fallback sync.
 */
export async function isUserWhopPro(email: string): Promise<boolean> {
  if (!WHOP_API_KEY) {
    console.warn("WHOP_API_KEY is not configured - skipping Whop membership check");
    return false;
  }

  try {
    const formattedEmail = email.toLowerCase().trim();
    const response = await fetch(`https://api.whop.com/api/v2/memberships?email=${encodeURIComponent(formattedEmail)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${WHOP_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(`Whop API check returned error status: ${response.status}`);
      return false;
    }

    const json = await response.json();
    const memberships: WhopMembership[] = json.data || [];

    // Filter for memberships that are active, trialing, or valid
    const activeMembership = memberships.find((m) => {
      const status = (m.status || "").toLowerCase();
      return m.valid === true && (status === "active" || status === "valid" || status === "trialing" || status === "completed");
    });

    return !!activeMembership;
  } catch (error) {
    console.error("Failed to fetch user memberships from Whop API:", error);
    return false;
  }
}
