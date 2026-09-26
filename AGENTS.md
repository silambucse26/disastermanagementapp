<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history.
<!-- LOVABLE:END -->

- Use Lovable Cloud with authenticated RLS-scoped access for all operational data because the application contains role-sensitive records.
- Store role assignments only in `user_roles` and expose role checks through a security-definer function because client-controlled role state is unsafe.
- Keep shared dashboard pages under one authenticated application route and select the visible workspace from the verified database role because this prevents duplicate route trees.
- Use database transactions for allocation inventory changes and automatic low-stock alerts because quantity checks must remain consistent under concurrent use.
- Extend the existing entities additively and keep disaster-response modules in the shared authenticated workspace because deployed records and workflows must remain compatible.
