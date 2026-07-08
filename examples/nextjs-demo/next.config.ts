import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    transpilePackages: [
        '@scanupload/qr-code-generator-react',
        '@scanupload/qr-code-generator-core',
        '@scanupload/qr-code-generator-nextjs-server'
    ]
};

export default nextConfig;
