import { rscObserverMiddleware } from "rsc-observer/middleware";

export default rscObserverMiddleware();

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
