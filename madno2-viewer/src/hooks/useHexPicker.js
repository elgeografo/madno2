import { useState } from 'react';

export function useHexPicker() {
  const [pickedHex, setPickedHex] = useState(null);
  const [pointerPos, setPointerPos] = useState({ x: 0, y: 0 });

  const handleClick = ({ object, x, y }) => {
    if (object) {
      setPickedHex(object);
      setPointerPos({ x, y });
    } else {
      setPickedHex(null);
    }
  };

  return {
    pickedHex,
    pointerPos,
    handleClick,
  };
}
