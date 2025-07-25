import { Outlet } from "react-router";

export default function Version() {
  return (
    <>
      <div className="absolute bottom-10 left-10 text-xl opacity-50">En partenariat avec Mouse Fighter Food !!!</div>
      <Outlet />
    </>
  );
}
