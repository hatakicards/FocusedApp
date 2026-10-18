-- Programma inviti: il bonus di 40 punti per l'amico che compra un abbonamento
-- si assegna una sola volta per amico.
alter table public.referral add column if not exists purchase_bonus_paid boolean not null default false;
