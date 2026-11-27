import assert from "node:assert/strict";
import { test } from "node:test";
import { criarAgendador, type Timers } from "../../src/extension/agendador.ts";

/** Relógio falso: `avancar(ms)` dispara, na ordem, o que venceu. */
function relogio() {
  let agora = 0;
  let proximoId = 1;
  const pendentes = new Map<number, { quando: number; fn: () => void }>();
  const timers: Timers = {
    setTimeout(fn, ms) {
      const id = proximoId++;
      pendentes.set(id, { quando: agora + ms, fn });
      return id;
    },
    clearTimeout(id) {
      pendentes.delete(id as number);
    },
  };
  return {
    timers,
    pendentes: () => pendentes.size,
    avancar(ms: number) {
      agora += ms;
      for (const [id, t] of [...pendentes]) {
        if (t.quando <= agora) {
          pendentes.delete(id);
          t.fn();
        }
      }
    },
  };
}

test("um pedido só: roda uma vez, depois de 200 ms, e não antes", () => {
  const r = relogio();
  let chamadas = 0;
  const a = criarAgendador(r.timers, 200, () => chamadas++);
  a.agendar();
  r.avancar(199);
  assert.equal(chamadas, 0);
  r.avancar(1);
  assert.equal(chamadas, 1);
});

test("vários pedidos seguidos viram uma execução só, 200 ms depois do último", () => {
  const r = relogio();
  let chamadas = 0;
  const a = criarAgendador(r.timers, 200, () => chamadas++);
  a.agendar();
  r.avancar(150);
  a.agendar();
  r.avancar(150);
  a.agendar();
  r.avancar(199);
  assert.equal(chamadas, 0);
  r.avancar(1);
  assert.equal(chamadas, 1);
  r.avancar(1000);
  assert.equal(chamadas, 1);
});

test("depois de rodar, um pedido novo roda de novo", () => {
  const r = relogio();
  let chamadas = 0;
  const a = criarAgendador(r.timers, 200, () => chamadas++);
  a.agendar();
  r.avancar(200);
  a.agendar();
  r.avancar(200);
  assert.equal(chamadas, 2);
});

test("cancelar impede a execução pendente e não deixa timer para trás", () => {
  const r = relogio();
  let chamadas = 0;
  const a = criarAgendador(r.timers, 200, () => chamadas++);
  a.agendar();
  a.cancelar();
  assert.equal(r.pendentes(), 0);
  r.avancar(1000);
  assert.equal(chamadas, 0);
});

test("cancelar sem nada pendente não faz mal, e dá para agendar depois", () => {
  const r = relogio();
  let chamadas = 0;
  const a = criarAgendador(r.timers, 200, () => chamadas++);
  a.cancelar();
  a.agendar();
  r.avancar(200);
  assert.equal(chamadas, 1);
});

test("pedidos seguidos nunca deixam mais de um timer pendente", () => {
  const r = relogio();
  const a = criarAgendador(r.timers, 200, () => {});
  for (let i = 0; i < 50; i++) a.agendar();
  assert.equal(r.pendentes(), 1);
});
