export const basicUserInfo = JSON.stringify({
  query: `{
    user {
      id
      campus
      firstName
      lastName
      email
      login
      attrs
    }
  }`,
});