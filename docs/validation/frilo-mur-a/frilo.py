# Reprise du procede Frilo (DIN 4017, semelle) a partir des efforts par cas de charge du rapport,
# avec et sans les charges de categorie C en tete de voile. Lancer : python3 frilo.py
import math
B=3.45; phi=math.radians(32.5); g=18; d=0.6
Nd0=math.exp(math.pi*math.tan(phi))*math.tan(math.pi/4+phi/2)**2
Nb0=(Nd0-1)*math.tan(phi)
def din4017(N,T,M):
    e=M/N; bp=B-2*e; t=T/N
    Rk=bp*(g*d*Nd0*(1-t)**2+g*bp*Nb0*(1-t)**3)
    return e,bp,t,Rk,Rk/1.4
# Frilo tel quel
print('Nd0',Nd0,'Nb0',Nb0)
print('Frilo',din4017(373.51,148.02,279.09))
# Frilo sans charges Cat.C (cas 7 et 8)
T=148.02-0.7*2.80; M=279.09-0.7*(2.52+18.14)
e,bp,t,Rk,Rd=din4017(373.51,T,M); print('Frilo sans CatC',e,bp,t,Rk,Rd,'eta',504.43/Rd)
print('EQU sans CatC',(421.65-1.05*20.66)/636.81)
print('Gliss sans CatC',(205.31-1.05*2.8)/196.04)
print('ex 2e noyau sans CatC',M/373.51,M/373.51/(B/3))
print('voile M,V sans CatC',297.79-1.05*(2.52+17.02),145.87-1.05*2.8)
# talon As_top : contrainte triangulaire, frottement reparti
def tri(N,Mc,T,x0,x1):
    e=Mc/N; 
    if abs(e)<=B/6:
        s1=N/B*(1+6*e/B); s2=N/B*(1-6*e/B); s=lambda x:s1+(s2-s1)*x/B; L=B
    else:
        L=3*(B/2-e); s1=2*N/L; s=lambda x:max(0,s1*(1-x/L))
    # integration numerique
    n=20000; F=0; Mo=0; xf=0.6 if x0==0 else x0
    for i in range(n):
        x=x0+(x1-x0)*(i+0.5)/n; p=s(x); F+=p*(x1-x0)/n; Mo+=p*(x1-x0)/n*abs(x-xf)
    return F,Mo,T*F/N
# talon flexion : verif sur cas original
F,Mo,n=tri(510.96,375.68,196.44,1.05,3.45); print('talon orig',F,Mo,n,Mo+n*0.2)
F,Mo,n=tri(510.96,375.68-1.05*20.66,196.44-1.05*2.8,1.05,3.45); mt=Mo+n*0.2
print('talon sans CatC m_sol',mt,'mEd',-375.32+mt)
# talon tranchant
F,Mo,n=tri(375.73,419.64,205.31,1.05,3.45); print('talon V orig',F)
F,Mo,n=tri(375.73,419.64-1.05*20.66,205.31-1.05*2.8,1.05,3.45); print('talon V sans CatC',238.96-F)
# patin flexion bas
F,Mo,n=tri(509.38,292.57,157.43,0,0.6); print('patin orig',F,Mo,n,Mo-0.2*n)
F,Mo,n=tri(509.38,292.57-1.05*20.66,157.43-1.05*2.8,0,0.6); print('patin sans CatC mEd',Mo-0.2*n-1.35*2.45)
F,Mo,n=tri(375.73,419.64,205.31,0,0.6); print('patin V orig',F, 'M(cas tranchant) sans frottement',Mo-2.45,'avec',Mo-0.2*n-2.45)
F,Mo,n=tri(375.73,419.64-1.05*20.66,205.31-1.05*2.8,0,0.6); print('patin V sans CatC',F-8.16)
# portance DA2* avec les actions de l'app (caracteristiques)
K=(1-math.sin(phi))/(1+math.sin(phi)); Ht=6.48
PG=0.5*K*18*Ht**2
bands=[(5,0,1.85),(20,1.85,3.0),(9,4.85,3.5)]
Hq=0;Mq=0
for q,a,b in bands:
    z1=a*math.tan(phi); z2=min((a+b)*math.tan(math.pi/4+phi/2),Ht); P=K*q*(z2-z1); Hq+=P; Mq+=P*(Ht-(z1+z2)/2)
Vg=68.4+34.5+18*2.4*6.08; Mg=68.4*(1.725-0.825)+18*2.4*6.08*(1.725-2.25)
Mk=Mg+PG*Ht/3+Mq; Hk=PG+Hq
e,bp,t,Rk,Rd=din4017(Vg,Hk,Mk)
print('app DA2*: K',K,'PG',PG,'Hq',Hq,'Hk',Hk,'Mk',Mk,'e',e,'bp',bp,'t',t,'Rd',Rd,'eta',1.35*Vg/Rd)
