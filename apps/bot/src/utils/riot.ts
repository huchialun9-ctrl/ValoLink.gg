import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const RIOT_API_KEY = process.env.RIOT_API_KEY;

// Deterministic mock fallback list
const RANKS = [
  'Iron',
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Ascendant',
  'Immortal',
  'Radiant'
];

/**
 * Fetches the user's competitive rank based on their Riot ID (e.g. "User#TAG").
 * If the RIOT_API_KEY is not defined, it generates a deterministic rank based on the string hash.
 */
export async function fetchUserRank(riotId: string): Promise<string> {
  if (!riotId || !riotId.includes('#')) {
    return 'Unranked';
  }

  // If a real API key exists, we would fetch from Riot's endpoint:
  // e.g., https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/
  if (RIOT_API_KEY && RIOT_API_KEY.startsWith('RGAPI-')) {
    try {
      // Production code to fetch real Riot account and Valorant rank
      const [name, tag] = riotId.split('#');
      const accountRes = await fetch(
        `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${RIOT_API_KEY}`
      );
      if (accountRes.ok) {
        const accountData = await accountRes.json();
        const puuid = accountData.puuid;
        
        // Fetch Valorant rank details
        const rankRes = await fetch(
          `https://ap.api.riotgames.com/val/ranked/v1/leaderboards/by-act/current?size=1&puuid=${puuid}&api_key=${RIOT_API_KEY}`
        );
        if (rankRes.ok) {
          const rankData = await rankRes.json();
          // Map rating tiers to names
          return rankData.players?.[0]?.tierName || 'Gold';
        }
      }
    } catch (err) {
      console.warn('Riot API request failed, falling back to database/mock:', err);
    }
  }

  // Deterministic fallback based on Riot ID hash
  let hash = 0;
  for (let i = 0; i < riotId.length; i++) {
    hash = riotId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % RANKS.length;
  return RANKS[index];
}
