import Avatar from "boring-avatars";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export const createFaviconDataURL = (): string => {
  const colors = ["#000000", "#6B46C1", "#EC4899", "#F97316", "#FCD34D"];
  
  const avatarElement = createElement(Avatar, {
    size: 32,
    name: "ChatsParty",
    variant: "beam",
    colors: colors,
  });
  
  const svgString = renderToStaticMarkup(avatarElement);
  
  const encodedSVG = encodeURIComponent(svgString);
  return `data:image/svg+xml,${encodedSVG}`;
};