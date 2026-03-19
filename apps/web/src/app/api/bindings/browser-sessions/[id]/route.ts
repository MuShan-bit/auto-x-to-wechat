import {
  buildUnauthorizedResponse,
  getAuthenticatedApiUser,
  proxyApiRequest,
} from "../_shared";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedApiUser();

  if (!user) {
    return buildUnauthorizedResponse();
  }

  const { id } = await context.params;

  return proxyApiRequest(user, {
    path: `/bindings/browser-sessions/${id}`,
    method: "GET",
  });
}
