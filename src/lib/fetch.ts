export async function fetchRequest<T>(
  url: string,
  {
    method = "GET",
    body,
    headers = {},
  }: { method?: string; body?: T; headers?: Record<string, string> }
) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
