import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";

async function getStats() {
  const r = await fetch("http://localhost:3000/api/delay?ms=200&step=mui", {
    cache: "no-store",
  });
  return r.json();
}

export default async function MuiPage() {
  const stats = await getStats();
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100", py: 6 }}>
      <Container maxWidth="md">
        <Stack spacing={4}>
          <Box>
            <Typography variant="h3" component="h1" fontWeight={600}>
              Material UI page
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              MUI components rendered from a Server Component, styled via
              emotion CSS-in-JS at SSR time. The overlay's visual preview should
              adopt the inlined stylesheet and reproduce the same layout.
            </Typography>
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {[
              { label: "Requests", value: "142", color: "primary" },
              { label: "Errors", value: "3", color: "error" },
              { label: "p99", value: "230ms", color: "success" },
            ].map((stat) => (
              <Card key={stat.label} sx={{ flex: 1 }}>
                <CardContent>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ backgroundColor: "red" }}
                  >
                    {stat.label}
                  </Typography>
                  <Typography variant="h5" component="div" fontWeight={600}>
                    {stat.value}
                  </Typography>
                  <Chip
                    label={stat.color}
                    color={stat.color as "primary" | "error" | "success"}
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </CardContent>
              </Card>
            ))}
          </Stack>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Mocked stats from /api/delay
              </Typography>
              <Box
                component="pre"
                sx={{
                  bgcolor: "grey.900",
                  color: "grey.100",
                  p: 2,
                  borderRadius: 1,
                  fontSize: 12,
                  overflowX: "auto",
                }}
              >
                {JSON.stringify(stats, null, 2)}
              </Box>
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" spacing={1}>
                <Button variant="contained">Primary</Button>
                <Button variant="outlined">Secondary</Button>
                <Button variant="text">Text</Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
