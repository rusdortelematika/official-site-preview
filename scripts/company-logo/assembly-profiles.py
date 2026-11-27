"""A single constrained planar construction, partitioned into six solids.

Circle/line intersections are shared by both sides of every joint. Coordinates
are not independently traced or transformed for adjacent pieces.
"""
import json, math
from pathlib import Path
import numpy as np

OUT=Path(__file__).resolve().parent
R,RI=3.,2.60
def pt(x,y): return np.array([(x-1410)/135,-(y-409)/(135*.86)])
def line(a,b): return (pt(*a),pt(*b))
A=line((1106,212),(1282,504))
B=line((1466,68),(1274,390))
D=line((1508,278),(1742,615))
E=line((1376,756),(1594,421))
DR=(pt(1569,278),pt(1569,278)+D[1]-D[0])
EI=(pt(1464,705),pt(1464,705)+E[1]-E[0])
TAIL=line((1274,390),(1339,504))
YTOP=pt(0,233)[1]
YJOIN=pt(0,278)[1]
YLOW=pt(0,528)[1]
YLOWINNER=pt(0,578)[1]
def horizontal(y): return (np.array([-5.,y]),np.array([5.,y]))
def cross(a,b): return a[0]*b[1]-a[1]*b[0]
def meet(l,m):
 p,q=l; a,b=m; u=q-p;v=b-a
 return p+u*(cross(a-p,v)/cross(u,v))
def circle_intersect(l,r,near):
 p,q=l;d=q-p
 roots=np.roots([d@d,2*(p@d),p@p-r*r])
 candidates=[p+float(t.real)*d for t in roots if abs(t.imag)<1e-10]
 return min(candidates,key=lambda x:np.linalg.norm(x-near))
def oncircle(l,r,near):return circle_intersect(l,r,pt(*near))
def at_y(l,y):return meet(l,horizontal(y))
def circle_y(y,side,r): return np.array([side*math.sqrt(r*r-y*y),y])
def arc(a,b,ccw=True):
 r=np.linalg.norm(a); assert abs(r-np.linalg.norm(b))<1e-8
 start,end=math.atan2(a[1],a[0]),math.atan2(b[1],b[0])
 if ccw:
  while end<start: end+=2*math.pi
 else:
  while end>start: end-=2*math.pi
 n=max(2,math.ceil(abs(end-start)*R/.018))
 angles=np.linspace(start,end,n+1)
 return [a]+[np.array([r*math.cos(t),r*math.sin(t)]) for t in angles[1:-1]]+[b]
def join(*runs):
 out=[]
 for run in runs:
  for p in run:
   if not out or np.linalg.norm(out[-1]-p)>1e-9:out.append(p)
 if np.linalg.norm(out[-1]-out[0])<1e-9:out.pop()
 return out

# These vertices and entire seam segments are reused in adjacent profiles.
ao=oncircle(A,R,(1106,212)); ai=oncircle(A,RI,(1140,268))
bo=oncircle(B,R,(1466,68)); bi=oncircle(B,RI,(1430,120))
ro=circle_y(YJOIN,1,R);ri=circle_y(YJOIN,1,RI)
do=oncircle(D,R,(1742,615));di=oncircle(D,RI,(1700,560))
dri=oncircle(DR,RI,(1743,524))
eo=oncircle(E,R,(1376,756));ei=oncircle(E,RI,(1410,720))
eii=oncircle(EI,RI,(1464,705))
lo=circle_y(YLOW,-1,R);li=circle_y(YLOW,-1,RI)
llinner=circle_y(YLOWINNER,-1,RI)
ur_inner=circle_y(YTOP,1,RI)
btop=at_y(B,YTOP);bbottom=at_y(B,YJOIN)
dleft_top=at_y(D,YJOIN);dright_top=at_y(DR,YJOIN)
e_tip=meet(E,D);ei_tip=meet(EI,D)
bar_top=at_y(E,YLOW);bar_bottom=at_y(E,YLOWINNER)
tail_left=at_y(A,YLOW);tail_right=at_y(TAIL,YLOW)
apex=pt(1244,343)
hole_a=oncircle((apex,pt(1164,217)),RI,(1164,217))
hole_b=oncircle((apex,pt(1395,111)),RI,(1395,111))

parts=[
 dict(name='upper-left',outer=join(arc(ao,bo,False),[B[1],tail_right,tail_left]),holes=[join(arc(hole_a,hole_b,False),[apex])],open=[-.14,.14]),
 dict(name='upper-right',outer=join(arc(bo,ro,False),[bbottom,btop,ur_inner],arc(ur_inner,bi,True)),holes=[],open=[.10,.16]),
 dict(name='right',outer=join([dleft_top,dright_top,dri],arc(dri,ri,True),[ro],arc(ro,do,False)),holes=[],open=[.20,0]),
 dict(name='lower-right',outer=join([e_tip,ei_tip,eii],arc(eii,di,True),[do],arc(do,eo,False)),holes=[],open=[.05,-.20]),
 dict(name='lower-left',outer=join([lo,bar_top,bar_bottom,llinner],arc(llinner,ei,True),[eo],arc(eo,lo,False)),holes=[],open=[-.12,-.16]),
 dict(name='left',outer=join(arc(ao,lo,True),[li],arc(li,ai,False)),holes=[],open=[-.20,0]),
]
def xy(p):return [round(float(x),12) for x in p]
seams=[
 ('upper-left','upper-right',[bo,bi]),
 ('upper-left','upper-right',[btop,bbottom]),
 ('upper-right','right',[dleft_top,dright_top]),
 ('upper-right','right',[ri,ro]),
 ('right','lower-right',[e_tip,ei_tip]),
 ('right','lower-right',[di,do]),
 ('lower-right','lower-left',[bar_top,bar_bottom]),
 ('lower-right','lower-left',[ei,eo]),
 ('lower-left','left',[lo,li]),
 ('lower-left','upper-left',[tail_left,tail_right]),
 ('left','upper-left',[ao,ai]),
]
# Imprint both endpoints of every joint into both profiles. A shared line must
# have identical subdivisions as well, rather than a T-junction across floats.
anchors=[p for _,_,ps in seams for p in ps]
for part in parts:
 old=part['outer'];new=[]
 for i,a in enumerate(old):
  b=old[(i+1)%len(old)];d=b-a;length=d@d
  splits=[(0.,a)]
  for p in anchors:
   t=float((p-a)@d/length)
   if -1e-9<=t<=1+1e-9 and np.linalg.norm(a+t*d-p)<1e-8:
    if t<1-1e-9:splits.append((max(0.,t),p))
  for _,p in sorted(splits,key=lambda item:item[0]):
   if not new or np.linalg.norm(new[-1]-p)>1e-9:new.append(p)
 part['outer']=new

from shapely.geometry import Polygon, LineString
from shapely.ops import unary_union
from shapely.affinity import translate
polygons=[Polygon(p['outer'],p['holes']) for p in parts]
for p,poly in zip(parts,polygons):assert poly.is_valid,(p['name'],poly)
worst=0
for amount in np.linspace(0,1,201):
 moved=[translate(poly,xoff=p['open'][0]*amount,yoff=p['open'][1]*amount) for p,poly in zip(parts,polygons)]
 for i in range(len(moved)):
  for j in range(i+1,len(moved)):
   area=moved[i].intersection(moved[j]).area
   worst=max(worst,area)
   assert area<1e-9,('overlap',amount,parts[i]['name'],parts[j]['name'],area)
merged=unary_union(polygons)
print('closed union',merged.geom_type,'holes',len(merged.interiors) if merged.geom_type=='Polygon' else None,'max overlap',worst)
for a,b,points in seams:
 line=LineString(points)
 for name in [a,b]:
  boundary=polygons[[p['name'] for p in parts].index(name)].boundary
  assert line.difference(boundary.buffer(1e-9)).length<1e-8,('joint',a,b)
result={
 'reference':'video-rdt-style.mp4', 'construction':'Shared circle and straight-line intersections in one XY assembly plane',
 'radius':R,'innerRadius':RI,'depth':.538,'tiltCos':.86,
 'parts':[{**p,'outer':list(map(xy,p['outer'])),'holes':[[xy(v) for v in h] for h in p['holes']]} for p in parts],
 'seams':[dict(parts=[a,b],points=list(map(xy,points))) for a,b,points in seams],
 'validation':{'openingSamples':201,'maxIntersectionArea':float(worst),'jointSegments':len(seams),'closedArea':sum(p.area for p in polygons),'frontPlane':0},
}
(OUT/'assembly.json').write_text(json.dumps(result,separators=(',',':'))+'\n')

