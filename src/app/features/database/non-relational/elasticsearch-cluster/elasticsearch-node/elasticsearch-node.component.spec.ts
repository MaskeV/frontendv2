import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElasticsearchNodeComponent } from './elasticsearch-node.component';

describe('ElasticsearchNodeComponent', () => {
  let component: ElasticsearchNodeComponent;
  let fixture: ComponentFixture<ElasticsearchNodeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElasticsearchNodeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElasticsearchNodeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
