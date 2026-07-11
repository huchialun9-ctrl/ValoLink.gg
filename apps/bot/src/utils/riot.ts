import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const RIOT_API_KEY = process.env.RIOT_API_KEY;

/**
 * Fetches the user's competitive rank based on their Riot ID (e.g. "User#TAG").
 * Uses the real Riot API. Returns null if the account is not found or API key is missing.
 */
export async function fetchUserRank(riotId: string): Promise<string | null> {
  if (!riotId || !riotId.includes('#')) {
    return null;
  }

  if (!RIOT_API_KEY || !RIOT_API_KEY.startsWith('RGAPI-')) {
    console.warn('[Riot API] RIOT_API_KEY is not set or invalid. Cannot fetch real rank.');
    return null;
  }

  try {
    const [name, tag] = riotId.split('#');

    // Step 1: Resolve PUUID from Riot ID
    const accountRes = await fetch(
      `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
      { headers: { 'X-Riot-Token': RIOT_API_KEY } }
    );

    if (!accountRes.ok) {
      const err = await accountRes.text();
      console.warn(`[Riot API] Account lookup failed for "${riotId}":`, err);
      return null;
    }

    const accountData = await accountRes.json();
    const puuid = accountData.puuid;

    // Step 2: Fetch Valorant MMR / rank via Henrik third-party API
    // (Official Riot API does not publicly expose Valorant ranked tier by PUUID directly)
    // We use a well-known community API proxy as a workaround:
    const rankRes = await fetch(
      `https://api.henrikdev.xyz/valorant/v1/by-puuid/mmr/ap/${puuid}`,
      { headers: { 'Authorization': RIOT_API_KEY } }
    );

    if (rankRes.ok) {
      const rankData = await rankRes.json();
      const tier = rankData?.data?.currenttierpatched;
      if (tier) return tier; // e.g., "Diamond 2", "Immortal 1"
    }

    return null;
  } catch (err) {
    console.error('[Riot API] Unexpected error fetching rank:', err);
    return null;
  }
}
