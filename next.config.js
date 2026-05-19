module.exports = {
  basePath: "",
  assetPrefix: "",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:4100/api/:path*",
      },
    ];
  },
  async redirects() {
    return [
      { source: "/baver", destination: "/", permanent: false },
      { source: "/baver/:path*", destination: "/:path*", permanent: false },
    ];
  },
};
