type GraphQLClient = (
  query: string,
  options?: { variables?: Record<string, unknown> }
) => Promise<{ json: () => Promise<{ data: unknown; errors?: unknown[] }> }>;

interface LineItem {
  quantity: number;
  title: string;
  sku: string;
  variantTitle: string;
  product: {
    handle: string;
    featuredImage: { url: string } | null;
  } | null;
}

interface ShippingAddress {
  firstName: string;
  lastName: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  provinceCode: string;
  zip: string;
  countryCodeV2: string;
}

interface Order {
  name: string;
  createdAt: string;
  email: string;
  phone: string;
  shippingAddress: ShippingAddress | null;
  lineItems: { edges: { node: LineItem }[] };
}

interface OrderEdge {
  node: Order;
}

interface OrdersData {
  orders: {
    edges: OrderEdge[];
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
}

const ORDERS_QUERY = `
  query GetOrders($query: String!, $after: String) {
    orders(first: 250, query: $query, after: $after, sortKey: CREATED_AT) {
      edges {
        node {
          name
          createdAt
          email
          phone
          shippingAddress {
            firstName
            lastName
            phone
            address1
            address2
            city
            provinceCode
            zip
            countryCodeV2
          }
          lineItems(first: 50) {
            edges {
              node {
                quantity
                title
                sku
                variantTitle
                product {
                  handle
                  featuredImage {
                    url
                  }
                }
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

function formatOrderDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const min = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${yyyy}/${mm}/${dd} ${hh}:${min}:${ss}`;
}

function makeSmallUrl(url: string): string {
  if (!url) return "";
  // Insert _small before extension: image.jpg -> image_small.jpg
  return url.replace(/(\.[a-z]+)(\?|$)/i, "_small$1$2");
}

function csvField(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function orderToRows(order: Order, shopDomain: string): string[] {
  const addr = order.shippingAddress;
  const fullName = addr
    ? `${addr.firstName || ""} ${addr.lastName || ""}`.trim()
    : "";
  const phone = addr?.phone || order.phone || "";
  const email = order.email || "";
  const address1 = addr?.address1 || "";
  const address2 = addr?.address2 || "";
  const city = addr?.city || "";
  const province = addr?.provinceCode || "";
  const zip = addr?.zip || "";
  const countryCode = addr?.countryCodeV2 || "";
  const referenceId = order.name;
  const orderDate = formatOrderDate(order.createdAt);

  return order.lineItems.edges.map(({ node: item }) => {
    const preview = item.product?.featuredImage?.url || "";
    const imageSmall = makeSmallUrl(preview);
    const handle = item.product?.handle || "";
    const storefrontUrl = handle
      ? `https://${shopDomain}/products/${handle}`
      : "";

    const row = [
      fullName,
      phone,
      email,
      address1,
      address2,
      city,
      province,
      zip,
      countryCode,
      referenceId,
      "",
      String(item.quantity),
      item.title,
      item.sku || "",
      item.variantTitle === "Default Title" ? item.variantTitle : item.variantTitle,
      preview,
      "",
      "",
      orderDate,
      "",
      storefrontUrl,
      imageSmall,
    ];

    return row.map(csvField).join(",");
  });
}

async function fetchAllOrders(
  graphql: GraphQLClient,
  queryStr: string
): Promise<Order[]> {
  const orders: Order[] = [];
  let cursor: string | undefined;

  do {
    const res = await graphql(ORDERS_QUERY, {
      variables: { query: queryStr, after: cursor ?? null },
    });
    const data = (await res.json()) as { data: OrdersData };
    const page = data.data.orders;
    orders.push(...page.edges.map((e) => e.node));

    if (page.pageInfo.hasNextPage) {
      cursor = page.pageInfo.endCursor;
    } else {
      break;
    }
  } while (true);

  return orders;
}

export async function generateSupplierCSV(
  graphql: GraphQLClient,
  startDate: string,
  endDate: string
): Promise<string> {
  // Build shop domain from session — we use a shop info query
  const shopRes = await graphql(`{ shop { myshopifyDomain } }`);
  const shopData = (await shopRes.json()) as {
    data: { shop: { myshopifyDomain: string } };
  };
  const shopDomain = shopData.data.shop.myshopifyDomain;

  // Shopify query: created_at between start and end (inclusive of end day)
  const endDateInclusive = new Date(endDate);
  endDateInclusive.setDate(endDateInclusive.getDate() + 1);
  const endISO = endDateInclusive.toISOString().split("T")[0];

  const queryStr = `created_at:>=${startDate} created_at:<${endISO} financial_status:paid`;

  const orders = await fetchAllOrders(graphql, queryStr);

  const HEADER =
    "full_name,phone,email,address1,address2,city,province,zip,country_code,reference_id,reference_id2,Quantity,description,variant_code,variant_title,preview,option_ship,brand_code,order_date,link_ali,Product Storefront Url,Image Small";

  const rows = orders.flatMap((order) => orderToRows(order, shopDomain));

  return [HEADER, ...rows].join("\n");
}
