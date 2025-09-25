import useAuthStore from "@/stores/useAuthStore";
export const useFetch = () => {
  const { setSession } = useAuthStore();

  async function fetchRequest<T>(
    url: string,
    {
      method = "GET",
      body,
      headers = {},
      token,
    }: {
      method?: string;
      body?: T;
      headers?: Record<string, string>;
      token?: string;
    }
  ) {
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",

        ...headers,
      },
    };

    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responserData = await response.json();
    if (responserData.data?.accessToken && responserData.data?.refreshToken) {
      setSession({
        accessToken: responserData.data.accessToken,
        refreshToken: responserData.data.refreshToken,
      });
    }
    return responserData;
  }
  return { fetchRequest };
};
