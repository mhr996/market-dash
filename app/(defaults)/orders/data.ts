// Dummy data for orders
export interface OrderItem {
    name: string;
    quantity: number;
    price: number;
}

export interface Order {
    id: number;
    name: string;
    image: string | null;
    buyer: string;
    date: string;
    total: string;
    status: 'completed' | 'processing' | 'cancelled';
    address: string;
    items: OrderItem[];
}

export const orders: Order[] = [
    {
        id: 1,
        name: 'Electronics Bundle',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'John Doe',
        date: '2024-06-01',
        total: '$299.97',
        status: 'completed',
        address: '123 Main St, Anytown, USA 12345',
        items: [
            { name: 'Wireless Headphones', quantity: 1, price: 99.99 },
            { name: 'Phone Case', quantity: 2, price: 24.99 },
            { name: 'USB Cable', quantity: 3, price: 15.0 },
        ],
    },
    {
        id: 2,
        name: 'Smart Watch',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'Jane Smith',
        date: '2024-06-05',
        total: '$199.99',
        status: 'processing',
        address: '456 Oak Ave, Sometown, USA 67890',
        items: [{ name: 'Smart Watch', quantity: 1, price: 199.99 }],
    },
    {
        id: 3,
        name: 'Audio Equipment',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'Alice Johnson',
        date: '2024-06-10',
        total: '$149.98',
        status: 'cancelled',
        address: '789 Pine Rd, Yourtown, USA 13579',
        items: [
            { name: 'Bluetooth Speaker', quantity: 1, price: 49.99 },
            { name: 'Wireless Earbuds', quantity: 1, price: 99.99 },
        ],
    },
    {
        id: 4,
        name: 'Gaming Setup',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'Bob Wilson',
        date: '2024-06-12',
        total: '$449.96',
        status: 'completed',
        address: '321 Elm St, Gametown, USA 24680',
        items: [
            { name: 'Gaming Mouse', quantity: 1, price: 79.99 },
            { name: 'Mechanical Keyboard', quantity: 1, price: 149.99 },
            { name: 'Gaming Headset', quantity: 1, price: 129.99 },
            { name: 'Mouse Pad', quantity: 1, price: 29.99 },
        ],
    },
    {
        id: 5,
        name: 'Office Supplies',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'Carol Davis',
        date: '2024-06-15',
        total: '$89.94',
        status: 'processing',
        address: '654 Business Blvd, Worktown, USA 97531',
        items: [
            { name: 'Wireless Mouse', quantity: 2, price: 19.99 },
            { name: 'Notebook Set', quantity: 3, price: 12.99 },
            { name: 'Desk Organizer', quantity: 1, price: 24.99 },
        ],
    },
    {
        id: 6,
        name: 'Home Decor',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'David Brown',
        date: '2024-06-18',
        total: '$179.97',
        status: 'completed',
        address: '987 Home Ave, Decortown, USA 86420',
        items: [
            { name: 'Table Lamp', quantity: 1, price: 79.99 },
            { name: 'Picture Frame', quantity: 3, price: 19.99 },
            { name: 'Decorative Vase', quantity: 1, price: 39.99 },
        ],
    },
    {
        id: 7,
        name: 'Fitness Equipment',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'Eva Martinez',
        date: '2024-06-20',
        total: '$259.97',
        status: 'processing',
        address: '147 Fitness St, Gymtown, USA 75319',
        items: [
            { name: 'Yoga Mat', quantity: 1, price: 29.99 },
            { name: 'Resistance Bands', quantity: 1, price: 39.99 },
            { name: 'Dumbbells Set', quantity: 1, price: 189.99 },
        ],
    },
    {
        id: 8,
        name: 'Kitchen Essentials',
        image: '/assets/images/img-placeholder-fallback.webp',
        buyer: 'Frank Garcia',
        date: '2024-06-22',
        total: '$124.96',
        status: 'completed',
        address: '258 Cook Lane, Cheftown, USA 64208',
        items: [
            { name: 'Coffee Maker', quantity: 1, price: 89.99 },
            { name: 'Kitchen Scale', quantity: 1, price: 24.99 },
            { name: 'Mixing Bowls', quantity: 1, price: 19.98 },
        ],
    },
];
