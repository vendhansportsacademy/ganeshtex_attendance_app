export const api = {
  async request(method: "GET" | "POST" | "PUT" | "DELETE", endpoint: string, bodyOrParams?: any) {
    const isPostOrPut = method === "POST" || method === "PUT";
    let url = `/api${endpoint}`;
    let fetchOptions: RequestInit = { method };

    if (isPostOrPut) {
      fetchOptions.headers = { "Content-Type": "application/json" };
      fetchOptions.body = JSON.stringify(bodyOrParams);
    } else if (bodyOrParams) {
      const searchParams = new URLSearchParams();
      Object.keys(bodyOrParams).forEach(key => {
        if (bodyOrParams[key] !== undefined && bodyOrParams[key] !== null) {
          searchParams.append(key, String(bodyOrParams[key]));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) url += `?${queryString}`;
    }

    const res = await fetch(url, fetchOptions);
    const contentType = res.headers.get("content-type");
    const text = await res.text();

    if (contentType && contentType.includes("text/html") && text.includes("Starting Server")) {
      throw new Error("The backend server is still initializing. Please wait a moment and try again.");
    }

    let result;
    try {
      result = text ? JSON.parse(text) : {};
    } catch (e) {
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      console.error("Malformed JSON response:", text.substring(0, 500));
      throw new Error("The server returned an unexpected response format. It might be restarting.");
    }

    if (!res.ok) {
      throw new Error(result.error || `Request failed with status ${res.status}`);
    }
    return result;
  },

  async post(endpoint: string, data: any) {
    return this.request("POST", endpoint, data);
  },

  async get(endpoint: string, params?: any) {
    return this.request("GET", endpoint, params);
  },

  async put(endpoint: string, data: any) {
    return this.request("PUT", endpoint, data);
  },

  async delete(endpoint: string) {
    return this.request("DELETE", endpoint);
  },
};
