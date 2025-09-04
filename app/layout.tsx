import ProviderComponent from '@/components/layouts/provider-component';
import 'react-perfect-scrollbar/dist/css/styles.css';
import '../styles/tailwind.css';
import { Metadata } from 'next';
import { Nunito, Almarai } from 'next/font/google';

export const metadata: Metadata = {
    title: {
        template: '%s | PAZAR',
        default: 'PAZAR - Dashboard',
    },
};
const nunito = Nunito({
    weight: ['400', '500', '600', '700', '800'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-nunito',
});

const almarai = Almarai({
    weight: ['300', '400', '700', '800'],
    subsets: ['arabic'],
    display: 'swap',
    variable: '--font-almarai',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={`${nunito.variable} ${almarai.variable}`}>
                <ProviderComponent>{children}</ProviderComponent>
            </body>
        </html>
    );
}
