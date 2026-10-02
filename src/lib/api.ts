export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api' + path, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Unable to reach DataForge. Check your connection, then try again. The hosted demo may be waking up.',
      0,
    );
  }
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: 'The request could not be completed.' }));
    throw new ApiError(
      data.error +
        (data.issues?.length
          ? ' ' +
            data.issues
              .map((i: { field: string; message: string }) => i.field + ': ' + i.message)
              .join('; ')
          : ''),
      response.status,
    );
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const send = (value: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(value),
});
export async function download(id: string, format: 'csv' | 'xlsx') {
  const response = await fetch('/api/datasets/' + id + '/export?format=' + format, {
    credentials: 'include',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Download failed.' }));
    throw new ApiError(data.error, response.status);
  }
  const header = response.headers.get('Content-Disposition');
  const filename = header?.match(/filename="([^"]+)"/)?.[1] || 'dataforge-cleaned.' + format;
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
