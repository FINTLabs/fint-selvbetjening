import {
  BodyLong,
  Box,
  Heading,
  Page,
  Theme as AkselTheme,
} from "@navikt/ds-react";
import {
  NovariFooter,
  NovariHeader,
  NovariSubHeader,
  ThemeProvider,
  useTheme,
} from "novari-frontend-components";
import type { ReactNode } from "react";
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigate,
} from "react-router";
import { KeyVerticalIcon } from "@navikt/aksel-icons";
import { UserOrganization } from "~/components/UserOrganization";
import { fetchMe, type User } from "~/server/auth.server";
import { selectOrgCookie } from "~/utils/cookie";
import { HeaderProperties } from "~/utils/headerProperties";
import type { Route } from "./+types/root";
import "@navikt/ds-css";
import "novari-frontend-components/lib/index.css";
import "./app.css";

const footerLinks = [
  { label: "Driftsmeldinger", href: "https://novari.no/driftsmeldinger/" },
  { label: "Support", href: "https://support.novari.no" },
];

function appMenu(isAdmin: boolean) {
  const items: Array<{
    label: string;
    action: string;
    icon?: React.ReactNode;
    submenu?: Array<{ label: string; action: string }>;
  }> = [
    { label: "Dashboard", action: "/" },
    {
      label: "Tilganger",
      action: "",
      submenu: [
        { label: "Integrasjoner", action: "/integrasjoner" },
        { label: "Komponenter", action: "/komponenter" },
        { label: "Kontakter", action: "/kontakter" },
      ],
    },
    {
      label: "Helse",
      action: "",
      submenu: [
        { label: "Hendelseslogg", action: "/xxx" },
        { label: "Relasjonstest", action: "/xxx" },
        { label: "Linkwalker", action: "/linkwalker" },
        { label: "Testrunner", action: "/testrunner" },
      ],
    },
  ];

  if (isAdmin) {
    //TODO: testing having a admin page vs a dropdown menu
    // items.push({
    //   label: "Admin",
    //   action: "",
    //   icon: <KeyVerticalIcon title="a11y-title" fontSize="1.5rem" />,
    //   submenu: [
    //     { label: "Kontakter", action: "/admin/kontakter" },
    //     { label: "Organisasjoner", action: "/admin/organisasjoner" },
    //     { label: "Komponenter", action: "/admin/komponenter" },
    //   ],
    // });
    if (isAdmin) {
      items.push({
        label: "Admin",
        action: "/admin",
        icon: <KeyVerticalIcon aria-hidden fontSize="1.5rem" />,
      });
    }
  }

  return items;
}

export async function loader({ request }: Route.LoaderArgs) {
  const pathname = new URL(request.url).pathname;
  if (pathname.startsWith("/.well-known/") || pathname.startsWith("/api/")) {
    return { user: null };
  }

  HeaderProperties.setProperties(request);

  let meData: User;
  try {
    meData = await fetchMe();
  } catch (error) {
    if (error instanceof Response) {
      const message = await error.text();
      throw data(
        { message, source: "me" },
        {
          status: error.status,
          statusText: error.statusText,
        },
      );
    }
    throw error;
  }

  HeaderProperties.setUsername(meData.name);

  const cookieValue = await selectOrgCookie.parse(HeaderProperties.getCookie());
  if (meData.organisation && cookieValue !== meData.organisation.name) {
    return data(
      { user: meData },
      {
        headers: {
          "Set-Cookie": await selectOrgCookie.serialize(
            meData.organisation.name,
          ),
        },
      },
    );
  }

  return { user: meData };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  if (formData.get("actionType") !== "UPDATE_SELECTED_ORGANIZATION") {
    return { ok: true };
  }

  HeaderProperties.setProperties(request);
  const user = await fetchMe();
  const selectedOrganization = String(
    formData.get("selectedOrganization") ?? "",
  );
  const allowed = user.organisations.some(
    (organisation) => organisation.name === selectedOrganization,
  );
  if (!allowed) {
    throw new Response("Du har ikke tilgang.", {
      status: 403,
      statusText: "Du har ikke tilgang.",
    });
  }

  return data(
    { ok: true },
    {
      headers: {
        "Set-Cookie": await selectOrgCookie.serialize(selectedOrganization),
      },
    },
  );
}

function AppTheme({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <AkselTheme theme={theme} className="novari-theme" hasBackground>
      {children}
    </AkselTheme>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="nb">
      <head>
        <title></title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <ThemeProvider>
          <AppTheme>{children}</AppTheme>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { user } = loaderData;
  const { pathname } = useLocation();
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!user) {
    return null;
  }

  //TODO: novari components submenu needs a dark mode
  //TODO: novari footer theme switcher has the wrong icon for dark/light
  return (
    <Box asChild background={isAdminArea ? "brand-magenta-softA" : "default"}>
      <Page
        footer={
          <Box padding="space-2" as="footer" className="novari-footer">
            <Page.Block gutters width="lg">
              <NovariFooter links={footerLinks} showThemeSwitcher />
            </Page.Block>
          </Box>
        }
      >
        <Box className="novari-header" as="nav" shadow="dialog">
          <NovariHeader
            appName="FINT Selvbetjening"
            menu={appMenu(user.isAdmin)}
            isLoggedIn
            displayName={user.name}
            showLogoWithTitle
            onLogin={() => undefined}
            onLogout={() => undefined}
            onMenuClick={(action) => navigate(action)}
          >
            <UserOrganization user={user} />
          </NovariHeader>
          {user.isAdmin && isAdminArea && (
              <NovariSubHeader
                  appName="Administration"
                  menu={[
                      ["Kontakter", "/admin/kontakter"],
                      ["Organisasjoner", "/admin/organisasjoner"],
                      ["Komponenter", "/admin/komponenter"],
                  ]}
                  onMenuClick={(action) => navigate(action)}
              />
          )}
        </Box>

        <Box asChild background="default" margin={"space-16"} borderRadius="12">
          <Page.Block as="main" width="xl" gutters>
            <Outlet />
          </Page.Block>
        </Box>
      </Page>
    </Box>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 406) {
    return (
      <Box paddingBlock="space-16">
        <Heading level="1" size="large" spacing>
          Du har ikke opprettet bruker.
        </Heading>
        <BodyLong>
          Du må opprette bruker før du kan bruke FINT Selvbetjening.
        </BodyLong>
      </Box>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 403) {
    return (
      <Box paddingBlock="space-16">
        <Heading level="1" size="large" spacing>
          Du har ikke tilgang.
        </Heading>
        <BodyLong>Denne siden er bare for administratorer.</BodyLong>
      </Box>
    );
  }

  if (isRouteErrorResponse(error) && error.status === 401) {
    return (
      <Box paddingBlock="space-16">
        <Heading level="1" size="large" spacing>
          Du er ikke innlogget.
        </Heading>
        <BodyLong>
          Fødselsnummer ble ikke sendt fra innloggingstjenesten.
        </BodyLong>
      </Box>
    );
  }

  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
