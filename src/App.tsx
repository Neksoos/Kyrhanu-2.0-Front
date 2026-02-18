<Route
  path="/"
  element={<Navigate to={storage.getAccessToken() ? '/home' : '/auth'} replace />}
/>