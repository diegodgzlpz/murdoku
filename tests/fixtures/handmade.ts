import type { Positions } from '../../src/core/model/types';
import { cellIndex } from '../../src/core/model/geometry';
import { boardFromAscii, makePuzzle } from '../helpers';

/*
 Hand-made 6x6 puzzle with a known unique solution.

   a a a b b b      a Salón     b Cocina
   a a c c b b      c Dormitorio d Baño
   d a c c c b      e Despacho  f Comedor
   d d c e e e
   d d f f e e
   d f f f e e

 Solution: A(0,0) C(1,2) V(2,3) B(3,4) D(4,1) E(5,5). Murderer: C (alone with V in the Dormitorio).
*/
export const handmadeBoard = boardFromAscii(
  ['aaabbb', 'aaccbb', 'dacccb', 'ddceee', 'ddffee', 'dfffee'],
  {
    a: ['Salón', 'el'],
    b: ['Cocina', 'la'],
    c: ['Dormitorio', 'el'],
    d: ['Baño', 'el'],
    e: ['Despacho', 'el'],
    f: ['Comedor', 'el'],
  },
  [
    [0, 0, 'sofa'],
    [0, 2, 'plant'],
    [1, 0, 'tv'],
    [1, 2, 'bed'],
    [1, 3, 'wardrobe'],
    [2, 4, 'plant'],
    [0, 4, 'fridge'],
    [1, 5, 'table'],
    [1, 4, 'chair'],
    [3, 0, 'bathtub'],
    [4, 1, 'rug'],
    [3, 5, 'shelf'],
    [3, 4, 'chair'],
    [4, 4, 'table'],
    [5, 2, 'table'],
    [4, 2, 'chair'],
  ],
  [
    [0, 0, 'N'],
    [5, 5, 'E'],
    [2, 0, 'W'],
    [0, 4, 'N'],
  ],
);

const ROOM = { salon: 0, cocina: 1, dormitorio: 2, bano: 3, despacho: 4, comedor: 5 };

export const handmadePuzzle = makePuzzle(handmadeBoard, [
  { kind: 'onFurniture', person: 'A', furniture: 'sofa' },
  { kind: 'inRoom', person: 'C', room: ROOM.dormitorio },
  { kind: 'onFurniture', person: 'C', furniture: 'bed' },
  { kind: 'nextToWindow', person: 'E' },
  { kind: 'inRoom', person: 'E', room: ROOM.despacho },
  { kind: 'onFurniture', person: 'B', furniture: 'chair' },
  { kind: 'sameRoom', a: 'B', b: 'E' },
  { kind: 'relative', a: 'D', b: 'C', dir: 'W' },
]);

const at = (r: number, c: number) => cellIndex(r, c, 6);
export const handmadeSolution: Positions = {
  A: at(0, 0),
  C: at(1, 2),
  V: at(2, 3),
  B: at(3, 4),
  D: at(4, 1),
  E: at(5, 5),
};
