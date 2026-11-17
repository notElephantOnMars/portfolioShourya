// Files in public/ live under the site's base path on GitHub Pages (/portfolioShourya), and plain <a>/<video>
// tags don't add it automatically, so every link to a file in public/ goes through this.
export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/${encodeURI(path)}`;
