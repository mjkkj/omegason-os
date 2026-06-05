import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useNavigation } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  DatePicker,
  BlockStack,
  InlineStack,
  Badge,
  Banner,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { generateSupplierCSV } from "../csv.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ ok: true });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;

  try {
    const csv = await generateSupplierCSV(admin.graphql, startDate, endDate);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="supplier_orders_${startDate}_to_${endDate}.csv"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, { status: 500 });
  }
};

export default function Index() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const [{ month, year }, setDate] = useState({
    month: today.getMonth(),
    year: today.getFullYear(),
  });
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
  }>({
    start: yesterday,
    end: today,
  });

  const submit = useSubmit();
  const navigation = useNavigation();
  const isLoading = navigation.state === "submitting";

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const handleExport = () => {
    const form = new FormData();
    form.append("startDate", formatDate(selectedDates.start));
    form.append("endDate", formatDate(selectedDates.end));
    submit(form, { method: "post" });
  };

  return (
    <Page title="Supplier Order Exporter">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Export Orders to CSV
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Select a date range to export orders in the supplier format
                (fulfill.go compatible).
              </Text>

              <Box>
                <Text as="p" variant="bodyMd">
                  Selected range:{" "}
                  <Badge tone="info">{formatDate(selectedDates.start)}</Badge>
                  {" → "}
                  <Badge tone="info">{formatDate(selectedDates.end)}</Badge>
                </Text>
              </Box>

              <DatePicker
                month={month}
                year={year}
                onChange={setSelectedDates}
                onMonthChange={(m, y) => setDate({ month: m, year: y })}
                selected={selectedDates}
                allowRange
                disableDatesAfter={today}
              />

              <InlineStack gap="200" align="start">
                <Button
                  variant="primary"
                  onClick={handleExport}
                  loading={isLoading}
                  disabled={isLoading}
                >
                  {isLoading ? "Generating CSV…" : "Download CSV"}
                </Button>
              </InlineStack>

              <Banner tone="info">
                <Text as="p" variant="bodyMd">
                  The CSV will include all paid/fulfilled orders in the date
                  range. Each line item becomes a separate row. Format is
                  compatible with fulfill.go supplier upload.
                </Text>
              </Banner>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">
                CSV Columns
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                full_name · phone · email · address1 · address2 · city ·
                province · zip · country_code · reference_id · reference_id2 ·
                Quantity · description · variant_code · variant_title · preview
                · option_ship · brand_code · order_date · link_ali · Product
                Storefront Url · Image Small
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
