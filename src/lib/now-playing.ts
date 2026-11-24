// What I'm listening to, shown on the about page. Shared with the e2e tests, so this file has no
// Astro imports.

export interface NowPlaying {
  show: string;
  /** The podcast's site */
  showUrl: string;
  episode: string;
  /** A page that plays the episode */
  episodeUrl: string;
}

export const nowPlaying: NowPlaying = {
  show: 'Down Round',
  showUrl: 'https://downround.net/',
  episode: 'Jensen Huang Has Left the Building',
  episodeUrl: 'https://omny.fm/shows/down-round/huang-is-gone',
};

/** The one-line form the mobile marquee shows */
export const nowPlayingLine = ({ show, episode }: NowPlaying) => `${show} · ${episode}`;
