import { RouterProvider } from 'react-router-dom';
import router from 'routes';
import ThemeCustomization from 'themes';
import ScrollTop from 'components/ScrollTop';
import AuthSessionWatcher from 'components/AuthSessionWatcher';

export default function App() {
  return (
    <ThemeCustomization>
      <AuthSessionWatcher />
      <ScrollTop>
        <RouterProvider router={router} fallbackElement={<div>Loading...</div>} />
      </ScrollTop>
    </ThemeCustomization>
  );
}