import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KubernetesClustersComponent } from './kubernetes-clusters.component';

describe('KubernetesClustersComponent', () => {
  let component: KubernetesClustersComponent;
  let fixture: ComponentFixture<KubernetesClustersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KubernetesClustersComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(KubernetesClustersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
