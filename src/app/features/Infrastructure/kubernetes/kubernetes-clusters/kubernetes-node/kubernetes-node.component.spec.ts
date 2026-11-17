import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KubernetesNodeComponent } from './kubernetes-node.component';

describe('KubernetesNodeComponent', () => {
  let component: KubernetesNodeComponent;
  let fixture: ComponentFixture<KubernetesNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KubernetesNodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KubernetesNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
