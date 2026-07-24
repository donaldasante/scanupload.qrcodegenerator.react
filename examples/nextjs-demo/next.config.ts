import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: [
        '@scanupload/qr-code-generator-react',
        '@scanupload/qr-code-generator-core'
    ]
};

export default nextConfig;
