# Module Question List Spacing Design

## Goal

Add a clear `1rem` vertical gap between the module question summary and the
first question link without changing the component content or the spacing of
the related-question section.

## Design

Add the following scoped rule to `docs/app/globals.css`:

```css
.module-question-links > summary + ul {
  margin-top: 1rem;
}
```

The adjacent-sibling selector applies only to the first `<ul>` immediately
after the `<summary>`. It does not affect other lists, the related-question
heading, or the collapsed state of the `<details>` element.

## Verification

- Confirm the selector and `1rem` value are present in `globals.css`.
- Run the repository's relevant static checks.
- Open a module page and confirm the expanded question list has the requested
  gap while the collapsed summary and related-question section remain intact.
