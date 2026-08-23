const DEFAULT_LOCAL_API_BASE_URLS = [
  "http://localhost:5000",
  "http://localhost:5001",
  "http://localhost:5002",
  "http://localhost:5003",
];

function getApiBaseUrls() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return [configuredBaseUrl.replace(/\/$/, "")];
  }

  return DEFAULT_LOCAL_API_BASE_URLS;
}

function shouldTryNextApiBase(response, data) {
  if (!response) {
    return true;
  }

  if (response.status === 404 || response.status === 405) {
    return true;
  }

  return response.status >= 500 && !data?.code;
}

export async function postJson(path, body) {
  const apiBaseUrls = getApiBaseUrls();
  let lastError;

  for (const apiBaseUrl of apiBaseUrls) {
    let response;
    let data;

    try {
      response = await fetch(`${apiBaseUrl}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      data = await response.json().catch(() => null);
    } catch (error) {
      lastError = error;

      if (apiBaseUrl !== apiBaseUrls.at(-1)) {
        continue;
      }

      throw new Error("Backend is unavailable. Please try again.");
    }

    if (!response.ok) {
      lastError = new Error(
        data?.developerMessage || data?.message || "Request failed"
      );
      lastError.data = data;

      if (shouldTryNextApiBase(response, data) && apiBaseUrl !== apiBaseUrls.at(-1)) {
        continue;
      }

      throw lastError;
    }

    return data;
  }

  throw lastError || new Error("Backend is unavailable. Please try again.");
}

export async function getJson(path) {
  const apiBaseUrls = getApiBaseUrls();
  let lastError;

  for (const apiBaseUrl of apiBaseUrls) {
    let response;
    let data;

    try {
      response = await fetch(`${apiBaseUrl}${path}`);
      data = await response.json().catch(() => null);
    } catch (error) {
      lastError = error;

      if (apiBaseUrl !== apiBaseUrls.at(-1)) {
        continue;
      }

      throw new Error("Backend is unavailable. Please try again.");
    }

    if (!response.ok) {
      lastError = new Error(data?.message || "Request failed");

      if (shouldTryNextApiBase(response, data) && apiBaseUrl !== apiBaseUrls.at(-1)) {
        continue;
      }

      throw lastError;
    }

    return data;
  }

  throw lastError || new Error("Backend is unavailable. Please try again.");
}
