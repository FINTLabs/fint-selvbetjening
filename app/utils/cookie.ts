import { createCookie } from "react-router";

export const selectOrgCookie = createCookie("organisation", {
  maxAge: 60 * 60 * 24 * 14,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  sameSite: "lax",
});
