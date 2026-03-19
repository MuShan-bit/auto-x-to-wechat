import {
  buildUnauthorizedResponse,
  getAuthenticatedApiUser,
  proxyApiRequest,
} from "./_shared";

export async function POST() {
  const user = await getAuthenticatedApiUser();

  if (!user) {
    return buildUnauthorizedResponse();
  }

  return proxyApiRequest(user, {
    path: "/bindings/browser-sessions",
    method: "POST",
    body: JSON.stringify({}),
  });
}
