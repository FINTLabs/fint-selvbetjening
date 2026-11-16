import { HttpResponse, type JsonBodyType } from "msw";

export function json(data: JsonBodyType, status = 200) {
  return HttpResponse.json(data, { status });
}
