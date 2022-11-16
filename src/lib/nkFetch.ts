type NkFetch = <T>(
  url: string,
  option: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: {
      Authorization?: string;
    };
  },
) => Promise<T>;

const nkFetch: NkFetch = (url, option) => {
  return fetch(url, option)
    .then((data) => data.json())
    .catch((error) => {
      console.log(error);
    });
};

export default nkFetch;
