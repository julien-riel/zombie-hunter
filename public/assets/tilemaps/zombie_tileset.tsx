<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.11.2" name="zombie_tileset" tilewidth="32" tileheight="32" tilecount="192" columns="16">
 <image source="zombie_tileset.png" width="512" height="384"/>

 <!-- Ligne 0-1: Sol (ID 0-31) -->
 <tile id="0"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="1"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="2"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="3"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="4"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="5"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="6"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="7"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="8"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="9"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="10"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="11"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="12"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="13"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="14"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="15"><properties><property name="type" value="floor"/></properties></tile>
 <tile id="16"><properties><property name="type" value="floor_blood"/></properties></tile>
 <tile id="17"><properties><property name="type" value="floor_blood"/></properties></tile>

 <!-- Ligne 2-3: Murs (ID 32-63) - avec collision -->
 <tile id="32"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="33"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="34"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="35"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="36"><properties><property name="type" value="wall_damaged"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="37"><properties><property name="type" value="wall_damaged"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="38"><properties><property name="type" value="wall_damaged"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="39"><properties><property name="type" value="wall_damaged"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="40"><properties><property name="type" value="wall_reinforced"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="41"><properties><property name="type" value="wall_reinforced"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="42"><properties><property name="type" value="wall_reinforced"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="43"><properties><property name="type" value="wall_reinforced"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="44"><properties><property name="type" value="wall_corner_nw"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="45"><properties><property name="type" value="wall_corner_ne"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="46"><properties><property name="type" value="wall_corner_sw"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="47"><properties><property name="type" value="wall_corner_se"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="48"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="49"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="50"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="51"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="52"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="53"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="54"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="55"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="56"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="57"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="58"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="59"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="60"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="61"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="62"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="63"><properties><property name="type" value="wall"/><property name="collision" type="bool" value="true"/></properties></tile>

 <!-- Ligne 4: Portes (ID 64-79) -->
 <tile id="64"><properties><property name="type" value="door_active"/></properties></tile>
 <tile id="65"><properties><property name="type" value="door_active"/></properties></tile>
 <tile id="66"><properties><property name="type" value="door_inactive"/></properties></tile>
 <tile id="67"><properties><property name="type" value="door_inactive"/></properties></tile>
 <tile id="68"><properties><property name="type" value="door_open"/></properties></tile>
 <tile id="69"><properties><property name="type" value="door_open"/></properties></tile>
 <tile id="70"><properties><property name="type" value="door_destroyed"/></properties></tile>
 <tile id="71"><properties><property name="type" value="door_destroyed"/></properties></tile>

 <!-- Ligne 5: Covers (ID 80-95) - avec collision -->
 <tile id="80"><properties><property name="type" value="pillar"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="81"><properties><property name="type" value="pillar"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="82"><properties><property name="type" value="halfWall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="83"><properties><property name="type" value="halfWall"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="84"><properties><property name="type" value="table"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="85"><properties><property name="type" value="table"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="86"><properties><property name="type" value="crate"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="87"><properties><property name="type" value="crate"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="88"><properties><property name="type" value="shelf"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="89"><properties><property name="type" value="shelf"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="90"><properties><property name="type" value="barricade"/><property name="collision" type="bool" value="true"/></properties></tile>
 <tile id="91"><properties><property name="type" value="barricade"/><property name="collision" type="bool" value="true"/></properties></tile>

 <!-- Ligne 6: Zones terrain (ID 96-111) -->
 <tile id="96"><properties><property name="type" value="puddle"/></properties></tile>
 <tile id="97"><properties><property name="type" value="puddle"/></properties></tile>
 <tile id="98"><properties><property name="type" value="puddle_blood"/></properties></tile>
 <tile id="99"><properties><property name="type" value="puddle_blood"/></properties></tile>
 <tile id="100"><properties><property name="type" value="debris"/></properties></tile>
 <tile id="101"><properties><property name="type" value="debris"/></properties></tile>
 <tile id="102"><properties><property name="type" value="electric"/></properties></tile>
 <tile id="103"><properties><property name="type" value="electric"/></properties></tile>
 <tile id="104"><properties><property name="type" value="fire"/></properties></tile>
 <tile id="105"><properties><property name="type" value="fire"/></properties></tile>
 <tile id="106"><properties><property name="type" value="acid"/></properties></tile>
 <tile id="107"><properties><property name="type" value="acid"/></properties></tile>

 <!-- Ligne 7: Interactifs (ID 112-127) -->
 <tile id="112"><properties><property name="type" value="barrel_explosive"/></properties></tile>
 <tile id="113"><properties><property name="type" value="barrel_explosive"/></properties></tile>
 <tile id="114"><properties><property name="type" value="barrel_fire"/></properties></tile>
 <tile id="115"><properties><property name="type" value="barrel_fire"/></properties></tile>
 <tile id="116"><properties><property name="type" value="switch_on"/></properties></tile>
 <tile id="117"><properties><property name="type" value="switch_off"/></properties></tile>
 <tile id="118"><properties><property name="type" value="generator"/></properties></tile>
 <tile id="119"><properties><property name="type" value="generator"/></properties></tile>
 <tile id="120"><properties><property name="type" value="flame_trap"/></properties></tile>
 <tile id="121"><properties><property name="type" value="flame_trap"/></properties></tile>
 <tile id="122"><properties><property name="type" value="blade_trap"/></properties></tile>
 <tile id="123"><properties><property name="type" value="blade_trap"/></properties></tile>

 <!-- Ligne 8-9: Spawns et marqueurs (ID 128-159) -->
 <tile id="128"><properties><property name="type" value="spawn_player"/></properties></tile>
 <tile id="129"><properties><property name="type" value="spawn_player"/></properties></tile>
 <tile id="130"><properties><property name="type" value="spawn_zombie"/></properties></tile>
 <tile id="131"><properties><property name="type" value="spawn_zombie"/></properties></tile>
 <tile id="132"><properties><property name="type" value="spawn_boss"/></properties></tile>
 <tile id="133"><properties><property name="type" value="spawn_boss"/></properties></tile>
 <tile id="134"><properties><property name="type" value="objective"/></properties></tile>
 <tile id="135"><properties><property name="type" value="objective"/></properties></tile>
 <tile id="136"><properties><property name="type" value="checkpoint"/></properties></tile>
 <tile id="137"><properties><property name="type" value="checkpoint"/></properties></tile>
 <tile id="138"><properties><property name="type" value="teleporter"/></properties></tile>
 <tile id="139"><properties><property name="type" value="teleporter"/></properties></tile>

 <!-- Ligne 10-11: Décoration (ID 160-191) -->
 <tile id="160"><properties><property name="type" value="light"/></properties></tile>
 <tile id="161"><properties><property name="type" value="light"/></properties></tile>
 <tile id="162"><properties><property name="type" value="alarm"/></properties></tile>
 <tile id="163"><properties><property name="type" value="alarm"/></properties></tile>
 <tile id="164"><properties><property name="type" value="window"/></properties></tile>
 <tile id="165"><properties><property name="type" value="window"/></properties></tile>
 <tile id="166"><properties><property name="type" value="vent"/></properties></tile>
 <tile id="167"><properties><property name="type" value="vent"/></properties></tile>
</tileset>
