import { Suspense } from "react";

const TestTwo = async () => {
  async function step1() {
    const r = await fetch("http://localhost:3000/api/delay?ms=3000&step=1", {
      cache: "no-store",
    });
    return r.json();
  }

  const something = await step1();
  console.log(something);
  return (
    <div>bora testar um wait aqui com suspense e se mpra ver suncionando</div>
  );
};

const SuspendedTestTwo = () => (
  <Suspense fallback="loading test two">
    <TestTwo />
  </Suspense>
);

export default SuspendedTestTwo;
