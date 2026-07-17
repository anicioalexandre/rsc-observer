"use client";

import { useState } from "react";

const Test = ({ children }) => {
  const [value] = useState(1);
  return (
    <div>
      I am a client component, inside there is a server one: this is the value:{" "}
      {value}
      {children}
    </div>
  );
};

export default Test;
