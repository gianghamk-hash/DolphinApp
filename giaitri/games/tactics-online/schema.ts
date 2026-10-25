/** Dolphin Tactics 3D authoritative room contracts. Realtime Database stores maps (not sparse JS arrays). */
export type UID=string;
export type Phase="PREPARATION"|"COMBAT"|"TRANSITION";
export type RoomStatus="waiting"|"in_game"|"finished";
export type HeroId=string;
export type ItemId=string;
export interface Unit { id:string; heroId:HeroId; star:1|2|3; items:ItemId[] }
export type Board=Record<string,string>; // key r{0..3}c{0..7} -> unit instance ID
export type Bench=Record<string,string>; // key "0" .. "7" -> unit instance ID
export interface PlayerState {
 uid:UID; displayName:string; hp:number; gold:number; level:number; xp:number;
 board:Board; bench:Bench; units:Record<string,Unit>; shop:HeroId[];
 inventory:string[]; streaks:{win:number;loss:number}; ready:boolean; eliminated:boolean;
}
export interface CombatPair {a:UID;b:UID|null;ghost:boolean;pve:boolean}
export interface CombatReport {pair:CombatPair; winner:UID|null; loser:UID|null; damage:number; events:CombatEvent[]}
export interface CombatEvent {t:number;actor:string;target?:string;type:"move"|"attack"|"cast"|"die"|"heal"|"shield"|"end";amount?:number;x?:number;y?:number}
export interface RoomState{
 status:RoomStatus; round:number; roundPhase:Phase; phaseStartedAt:number; phaseEndsAt:number;
 hostId:UID; players:Record<UID,PlayerState>; playerOrder:UID[];
 seed:number; randomState:number; sequence:number; pairs:CombatPair[];
 combatSnapshot:Record<UID,PlayerState>|null; reports:CombatReport[];
 winnerId:UID|null; createdAt:number; updatedAt:number;
}
export interface HeroDef {id:HeroId;name:string;cost:1|2|3|4|5;origins:string[];classes:string[];
 hp:number;attack:number;armor:number;magicResist:number;attackSpeed:number;range:number;
 manaStart:number;manaMax:number;ability:{kind:string;power:number;radius:number}}
export interface TraitDef {type:"origin"|"class";thresholds:Record<string,Record<string,number>>}
export interface Component {id:string;name:string;stat:string;value:number}
export interface Recipe {id:ItemId;key:string;components:[string,string];name:string;
 bonus:Record<string,number>;effect:string}
export type Action =
 |{type:"BUY";index:number}
 |{type:"ROLL"}
 |{type:"BUY_XP"}
 |{type:"MOVE";unitId:string;to:"board"|"bench";index:string}
 |{type:"SELL";unitId:string}
 |{type:"EQUIP";unitId:string;component:string}
 |{type:"READY"};
