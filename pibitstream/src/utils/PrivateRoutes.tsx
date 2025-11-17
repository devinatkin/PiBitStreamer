import { Spin } from "antd";
import { useSelector } from "react-redux";
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { type RootState } from "../app/store";

const PrivateRoutes = () => {
  const { user, isLoading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return (
      <Spin
        spinning
        fullscreen
        tip="Checking authentication…"
      />
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?redirect=${redirect}`} replace />;
  }

  return <Outlet />;
};

export default PrivateRoutes;