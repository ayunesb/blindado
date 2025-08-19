export async function callEdge<T>(baseUrl: string, name: string, body: unknown, token?: string): Promise<T> {
  const url = `${baseUrl.replace(/\/$/,'')}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  return (await res.json()) as T;
}
