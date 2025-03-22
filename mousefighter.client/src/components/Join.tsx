import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router";
import { setSession } from "../utils/Store";

export default function Join() {

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const url = searchParams.get("roomId");
    if (url) {
      setSession(url)
    }
    navigate("/");
  }, [searchParams, navigate])
  
  return <></>
}