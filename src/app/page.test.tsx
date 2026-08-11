import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("HomePage accessibility", () => {
  it("names the page with a heading that isn't just the logo", () => {
    render(<HomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "CodeCollab" }),
    ).toBeInTheDocument();
  });

  it("labels the name field with something that survives typing", () => {
    render(<HomePage />);
    expect(
      screen.getByLabelText("Enter your name to create a room"),
    ).toBeInTheDocument();
  });

  it("announces the empty-name error and ties it to the field", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: /create room/i }));

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Please enter your name to continue");
    expect(
      screen.getByLabelText("Enter your name to create a room"),
    ).toHaveAttribute("aria-describedby", error.id);
  });
});
