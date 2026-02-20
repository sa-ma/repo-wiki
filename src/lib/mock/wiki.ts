import type { Wiki } from "@/types";

const REPO = "acme-corp/storefront";
const BASE_URL = `https://github.com/${REPO}/blob/main`;

export const mockWiki: Wiki = {
  repoUrl: `https://github.com/${REPO}`,
  repoName: "storefront",
  description:
    "A modern e-commerce storefront built with Next.js, featuring product browsing, cart management, checkout, and user account management.",
  generatedAt: new Date().toISOString(),
  features: [
    {
      id: "product-browsing",
      name: "Product Browsing & Search",
      summary:
        "Allows customers to discover products through category navigation, full-text search, and filtering by attributes like price, size, and color. Includes paginated product listings and detailed product pages with image galleries.",
      relatedFeatures: ["cart-management"],
      sections: [
        {
          title: "Overview",
          content:
            "The product browsing experience is the primary entry point for customers. It combines server-rendered product listings for SEO with client-side filtering for a snappy user experience. Search is powered by a debounced query against the `/api/products/search` endpoint, which uses PostgreSQL full-text search under the hood.",
          citations: [
            {
              id: "pb-1",
              file: "src/app/products/page.tsx",
              startLine: 1,
              endLine: 45,
              url: `${BASE_URL}/src/app/products/page.tsx#L1-L45`,
            },
          ],
          codeSnippets: [],
        },
        {
          title: "Search Implementation",
          content:
            "Search uses a custom `useSearch` hook that debounces user input by 300ms before firing an API request. Results are ranked by relevance using `ts_rank` in PostgreSQL. The search bar appears in the global header via the `SearchCommand` component, which uses a command palette pattern (Cmd+K to open).",
          citations: [
            {
              id: "pb-2",
              file: "src/hooks/use-search.ts",
              startLine: 8,
              endLine: 32,
              url: `${BASE_URL}/src/hooks/use-search.ts#L8-L32`,
            },
            {
              id: "pb-3",
              file: "src/components/search-command.tsx",
              startLine: 15,
              endLine: 60,
              url: `${BASE_URL}/src/components/search-command.tsx#L15-L60`,
            },
          ],
          codeSnippets: [
            {
              language: "typescript",
              code: `export function useSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery) return setResults([]);
    fetch(\`/api/products/search?q=\${debouncedQuery}\`)
      .then((res) => res.json())
      .then(setResults);
  }, [debouncedQuery]);

  return { query, setQuery, results };
}`,
              citation: {
                id: "pb-2",
                file: "src/hooks/use-search.ts",
                startLine: 8,
                endLine: 32,
                url: `${BASE_URL}/src/hooks/use-search.ts#L8-L32`,
              },
            },
          ],
        },
        {
          title: "Product Filtering",
          content:
            "Filters are applied client-side for instant feedback on small catalogs, with an automatic fallback to server-side filtering when the product count exceeds 500. Filter state is synced to URL search params so filtered views are shareable and bookmarkable.",
          citations: [
            {
              id: "pb-4",
              file: "src/components/product-filters.tsx",
              startLine: 22,
              endLine: 87,
              url: `${BASE_URL}/src/components/product-filters.tsx#L22-L87`,
            },
          ],
          codeSnippets: [],
        },
      ],
    },
    {
      id: "cart-management",
      name: "Shopping Cart",
      summary:
        "Manages the customer's shopping cart, including adding/removing items, updating quantities, and persisting cart state across sessions. Uses optimistic UI updates for instant feedback.",
      relatedFeatures: ["product-browsing", "checkout"],
      sections: [
        {
          title: "Overview",
          content:
            "The cart is implemented as a global context provider (`CartProvider`) that wraps the entire application. Cart state is persisted to both `localStorage` (for anonymous users) and the database (for authenticated users), with automatic reconciliation on sign-in.",
          citations: [
            {
              id: "cm-1",
              file: "src/providers/cart-provider.tsx",
              startLine: 1,
              endLine: 68,
              url: `${BASE_URL}/src/providers/cart-provider.tsx#L1-L68`,
            },
          ],
          codeSnippets: [],
        },
        {
          title: "Optimistic Updates",
          content:
            "Adding an item to the cart immediately updates the UI before the server confirms the mutation. If the server request fails, the cart rolls back to its previous state and displays an error toast. This pattern is used for add, remove, and quantity changes.",
          citations: [
            {
              id: "cm-2",
              file: "src/providers/cart-provider.tsx",
              startLine: 70,
              endLine: 112,
              url: `${BASE_URL}/src/providers/cart-provider.tsx#L70-L112`,
            },
            {
              id: "cm-3",
              file: "src/app/api/cart/route.ts",
              startLine: 15,
              endLine: 48,
              url: `${BASE_URL}/src/app/api/cart/route.ts#L15-L48`,
            },
          ],
          codeSnippets: [
            {
              language: "typescript",
              code: `async function addToCart(productId: string, quantity: number) {
  const prev = cart;
  // Optimistic update
  setCart((c) => ({
    ...c,
    items: [...c.items, { productId, quantity }],
  }));
  try {
    await fetch("/api/cart", {
      method: "POST",
      body: JSON.stringify({ productId, quantity }),
    });
  } catch {
    setCart(prev); // Rollback
    toast.error("Failed to add item to cart");
  }
}`,
              citation: {
                id: "cm-2",
                file: "src/providers/cart-provider.tsx",
                startLine: 70,
                endLine: 112,
                url: `${BASE_URL}/src/providers/cart-provider.tsx#L70-L112`,
              },
            },
          ],
        },
      ],
    },
    {
      id: "checkout",
      name: "Checkout & Payments",
      summary:
        "Handles the multi-step checkout process including address collection, shipping method selection, and payment processing via Stripe. Supports both guest and authenticated checkout flows.",
      relatedFeatures: ["cart-management", "user-accounts"],
      sections: [
        {
          title: "Overview",
          content:
            "Checkout is implemented as a multi-step form wizard with three stages: shipping address, shipping method, and payment. Each step validates before allowing progression. The entire flow is managed by a `useCheckout` reducer that maintains form state, validation errors, and the current step.",
          citations: [
            {
              id: "co-1",
              file: "src/app/checkout/page.tsx",
              startLine: 1,
              endLine: 35,
              url: `${BASE_URL}/src/app/checkout/page.tsx#L1-L35`,
            },
            {
              id: "co-2",
              file: "src/hooks/use-checkout.ts",
              startLine: 1,
              endLine: 95,
              url: `${BASE_URL}/src/hooks/use-checkout.ts#L1-L95`,
            },
          ],
          codeSnippets: [],
        },
        {
          title: "Stripe Integration",
          content:
            "Payment processing uses Stripe's Payment Intents API. A payment intent is created server-side when the customer reaches the payment step, and the client-side Stripe Elements form collects card details. The server webhook at `/api/webhooks/stripe` handles payment confirmation and order creation.",
          citations: [
            {
              id: "co-3",
              file: "src/app/api/checkout/payment-intent/route.ts",
              startLine: 10,
              endLine: 42,
              url: `${BASE_URL}/src/app/api/checkout/payment-intent/route.ts#L10-L42`,
            },
            {
              id: "co-4",
              file: "src/app/api/webhooks/stripe/route.ts",
              startLine: 1,
              endLine: 58,
              url: `${BASE_URL}/src/app/api/webhooks/stripe/route.ts#L1-L58`,
            },
          ],
          codeSnippets: [],
        },
      ],
    },
    {
      id: "user-accounts",
      name: "User Accounts & Authentication",
      summary:
        "Manages user registration, login, profile management, and order history. Authentication uses NextAuth.js with support for email/password and OAuth providers (Google, GitHub).",
      relatedFeatures: ["checkout"],
      sections: [
        {
          title: "Overview",
          content:
            "Authentication is handled by NextAuth.js configured in the catch-all route `/api/auth/[...nextauth]`. The app supports credential-based login and two OAuth providers. Session data is available throughout the app via the `useSession` hook, and server-side via `getServerSession`.",
          citations: [
            {
              id: "ua-1",
              file: "src/app/api/auth/[...nextauth]/route.ts",
              startLine: 1,
              endLine: 72,
              url: `${BASE_URL}/src/app/api/auth/%5B...nextauth%5D/route.ts#L1-L72`,
            },
          ],
          codeSnippets: [],
        },
        {
          title: "Order History",
          content:
            "Authenticated users can view their past orders at `/account/orders`. Each order page shows line items, shipping status, and tracking information. Orders are fetched server-side using React Server Components for fast initial loads.",
          citations: [
            {
              id: "ua-2",
              file: "src/app/account/orders/page.tsx",
              startLine: 1,
              endLine: 48,
              url: `${BASE_URL}/src/app/account/orders/page.tsx#L1-L48`,
            },
          ],
          codeSnippets: [],
        },
      ],
    },
  ],
};
