import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElasticsearchIndexComponent } from './elasticsearch-index.component';

describe('ElasticsearchIndexComponent', () => {
  let component: ElasticsearchIndexComponent;
  let fixture: ComponentFixture<ElasticsearchIndexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElasticsearchIndexComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElasticsearchIndexComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
