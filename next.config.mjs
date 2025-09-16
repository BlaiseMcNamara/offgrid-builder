/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://*.myshopify.com https://*.shopify.com https://admin.shopify.com https://*.shop.app https://offgriddoc.com.au https://www.offgriddoc.com.au"
          },
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' }
        ]
      }
    ]
  }
}
export default nextConfig
